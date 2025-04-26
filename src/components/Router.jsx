import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './LandingPage'
import HospitalMap from './HospitalMap'

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/map" element={<HospitalMap />} />
      </Routes>
    </BrowserRouter>
  )
}

export default Router
