import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import AppCalls from './components/AppCalls'
import ClickrGame from './components/ClickrGame'
import ConnectWallet from './components/ConnectWallet'
import Transact from './components/Transact'

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [openDemoModal, setOpenDemoModal] = useState(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState(false)
  const { activeAddress } = useWallet()

  return (
    <Router>
      <Routes>
        {/* Home Page */}
        <Route
          path="/"
          element={
            <div className="hero min-h-screen bg-gradient-to-r from-blue-900 to-pink-900 text-white">
              <div className="hero-content text-center rounded-lg p-6 max-w-md mx-auto">
                <div className="max-w-md">
                  <h1 className="text-4xl font-bold neon-text">Welcome to Clickr 🚀</h1>
                  <p className="py-6 text-xl">Ready to click and climb the leaderboard? Let's go!</p>

                  <div className="grid space-y-4">
                    <button className="btn m-2 neon-btn" onClick={() => setOpenWalletModal(true)}>
                      Connect Wallet
                    </button>

                    <Link to="/game" className="btn m-2 neon-btn">
                      Play Game
                    </Link>

                    <button className="btn m-2 neon-btn" onClick={() => setAppCallsDemoModal(true)}>
                      View Leaderboard
                    </button>
                  </div>

                  <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
                  <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
                  <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
                </div>
              </div>
            </div>
          }
        />

        {/* Clickr Game Page */}
        <Route path="/game" element={<ClickrGame />} />
      </Routes>
    </Router>
  )
}

export default Home
