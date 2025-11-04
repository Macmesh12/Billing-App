import { Command } from "@tauri-apps/plugin-shell";
import { appWindow } from "@tauri-apps/api/window";

const { invoke } = window.__TAURI__.core;

let greetInputEl;
let greetMsgEl;
let djangoChild = null;
let backendReadyPromise;
let backendPort = null;
let shuttingDown = false;

const decoder = new TextDecoder();

function attachListener(emitter, event, handler) {
  if (!emitter) {
    return;
  }

  if (typeof emitter.on === "function") {
    emitter.on(event, handler);
    return;
  }

  if (typeof emitter.addListener === "function") {
    emitter.addListener(event, handler);
  }
}

function normalizeLine(chunk) {
  if (chunk == null) {
    return "";
  }

  if (typeof chunk === "string") {
    return chunk;
  }

  if (chunk instanceof Uint8Array) {
    return decoder.decode(chunk);
  }

  if (Array.isArray(chunk)) {
    return chunk.map(normalizeLine).join("");
  }

  if (typeof chunk === "object") {
    if ("line" in chunk) {
      return normalizeLine(chunk.line);
    }

    if (Array.isArray(chunk.data)) {
      return decoder.decode(Uint8Array.from(chunk.data));
    }
  }

  return String(chunk);
}

function initializeFrontend() {
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");

  const form = document.querySelector("#greet-form");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        greetMsgEl.textContent = await invoke("greet", {
          name: greetInputEl.value,
        });
      } catch (error) {
        console.error("Failed to invoke greet command", error);
        greetMsgEl.textContent = "Unable to reach Rust command.";
      }
    });
  }
}

async function startBackendAndConnect() {
  if (backendReadyPromise) {
    return backendReadyPromise;
  }

  const command = Command.sidecar("binaries/django-app");

  backendReadyPromise = new Promise((resolve, reject) => {
    let settled = false;

    const settle = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      callback();
    };

    attachListener(command.stdout, "data", (chunk) => {
      const message = normalizeLine(chunk).trim();
      if (!message) {
        return;
      }

      if (message.startsWith("DJANGO_PORT:")) {
        const [, rawPort] = message.split(":");
        const port = rawPort?.trim();
        if (port) {
          backendPort = port;
          window.DJANGO_PORT = port;
          window.dispatchEvent(
            new CustomEvent("django-port-ready", { detail: { port } })
          );
          console.log(`Django sidecar listening on port ${port}`);
          settle(() => resolve(port));
        }
        return;
      }

      console.log(`[django] ${message}`);
    });

    attachListener(command.stderr, "data", (chunk) => {
      const message = normalizeLine(chunk).trim();
      if (message) {
        console.error(`[django:stderr] ${message}`);
      }
    });

    attachListener(command, "close", (event) => {
      djangoChild = null;
      if (!settled) {
        const code = event?.code;
        const signal = event?.signal;
        const reason =
          code !== undefined
            ? `code ${code}`
            : signal
            ? `signal ${signal}`
            : "an unknown reason";
        settle(() =>
          reject(new Error(`Django sidecar exited early with ${reason}.`))
        );
        backendReadyPromise = undefined;
      }
    });

    attachListener(command, "error", (error) => {
      if (!settled) {
        console.error("Django sidecar emitted an error", error);
        settle(() =>
          reject(error instanceof Error ? error : new Error(String(error)))
        );
        backendReadyPromise = undefined;
      }
    });

    (async () => {
      try {
        djangoChild = await command.spawn();
        console.log(`Django sidecar started with PID ${djangoChild.pid}`);
      } catch (error) {
        console.error("Failed to spawn Django sidecar", error);
        backendReadyPromise = undefined;
        settle(() =>
          reject(error instanceof Error ? error : new Error(String(error)))
        );
      }
    })();
  });

  return backendReadyPromise;
}

async function shutdownBackend() {
  if (djangoChild?.kill) {
    try {
      await djangoChild.kill();
    } catch (error) {
      console.warn("Failed to terminate Django sidecar gracefully", error);
    }
  }

  djangoChild = null;
  backendReadyPromise = undefined;
  backendPort = null;
  window.DJANGO_PORT = undefined;
}

function apiFetch(endpoint, options) {
  if (!backendPort) {
    return Promise.reject(new Error("Backend not ready yet."));
  }

  const url = `http://127.0.0.1:${backendPort}${endpoint}`;
  return fetch(url, options);
}

window.apiFetch = apiFetch;
window.waitForBackend = () => startBackendAndConnect();

window.addEventListener("DOMContentLoaded", async () => {
  initializeFrontend();

  try {
    await startBackendAndConnect();
  } catch (error) {
    console.error("Failed to start Django backend", error);
    if (greetMsgEl) {
      greetMsgEl.textContent = "Backend failed to start.";
    }
  }
});

appWindow.onCloseRequested(async (event) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  event.preventDefault();

  await shutdownBackend();
  await appWindow.close();
});

window.addEventListener("beforeunload", () => {
  if (!shuttingDown) {
    shutdownBackend();
  }
});
