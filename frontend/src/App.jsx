import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Invoice from './components/Invoice'
import Receipt from './components/Receipt'
import Waybill from './components/Waybill'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/invoice" element={<Invoice />} />
        <Route path="/receipt" element={<Receipt />} />
        <Route path="/waybill" element={<Waybill />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
