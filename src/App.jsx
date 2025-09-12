import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './Pages/Home'
import AudioWaterShader from './Components/Player/AudioWaveshader'
import Navbar from './Components/Navbar'
import Footer from './Components/Footer'
import GridFadeOutTransition from './Components/ani/Transition'

function App() {

  return (
    <>
    <GridFadeOutTransition />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/browse' element={<AudioWaterShader />} />
          <Route path='/play' element={<AudioWaterShader />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  )
}

export default App
