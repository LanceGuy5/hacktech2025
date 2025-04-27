import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import './App.css'
import LandingPage from '../src/components/LandingPage.tsx'
import HospitalMap from './components/HospitalMap.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/map" element={<HospitalMap />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
