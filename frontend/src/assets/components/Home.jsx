import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from './Layout';
import '../styles/home.css';

const Home = () => {
  const invoiceRef = useRef(null);
  const receiptRef = useRef(null);
  const waybillRef = useRef(null);

  useEffect(() => {
    const API_BASE = "http://127.0.0.1:8765";

    async function loadCounts() {
      try {
        const response = await fetch(`${API_BASE}/api/counter/counts/`);
        if (response.ok) {
          const data = await response.json();
          const invoiceTotal = data.invoice ?? data.invoices ?? 0;
          const receiptTotal = data.receipt ?? data.receipts ?? 0;
          const waybillTotal = data.waybill ?? data.waybills ?? 0;
          animateCount(invoiceRef.current, invoiceTotal);
          animateCount(receiptRef.current, receiptTotal);
          animateCount(waybillRef.current, waybillTotal);
        }
      } catch (error) {
        console.warn('Failed to load document counts', error);
      }
    }

    function animateCount(element, target) {
      if (!element) return;
      const duration = 800;
      const start = 0;
      const increment = target / (duration / 16);
      let current = start;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          element.textContent = target.toLocaleString();
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current).toLocaleString();
        }
      }, 16);
    }

    loadCounts();
  }, []);

  return (
    <Layout title="Dashboard | Billing App">
      <section className="dashboard-hero">
      </section>

      <section className="dashboard-counters" aria-label="Document counters">
        <Link to="/invoice" className="counter-card-link">
          <article className="counter-card">
            <span className="counter-value" ref={invoiceRef}>0</span>
            <span className="counter-label">Invoices</span>
          </article>
        </Link>

        <Link to="/receipt" className="counter-card-link">
          <article className="counter-card">
            <span className="counter-value" ref={receiptRef}>0</span>
            <span className="counter-label">Receipts</span>
          </article>
        </Link>

        <Link to="/waybill" className="counter-card-link">
          <article className="counter-card">
            <span className="counter-value" ref={waybillRef}>0</span>
            <span className="counter-label">Waybills</span>
          </article>
        </Link>
      </section>


      
    </Layout>
  );
};

export default Home;