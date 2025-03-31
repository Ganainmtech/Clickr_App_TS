import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import AppCalls from './components/AppCalls'
import ConnectWallet from './components/ConnectWallet'
import Transact from './components/Transact'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const toggleDemoModal = () => {
    setOpenDemoModal(!openDemoModal)
  }

  const toggleAppCallsModal = () => {
    setAppCallsDemoModal(!appCallsDemoModal)
  }

  return (
    <div className="hero min-h-screen bg-gradient-to-r from-blue-900 to-pink-900 text-white">
      <div className="hero-content text-center rounded-lg p-6 max-w-md mx-auto">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold neon-text">Welcome to Clickr 🚀</h1>
          <p className="py-6 text-xl">Ready to click and climb the leaderboard? Let's go!</p>

          <div className="grid space-y-4">
            <a
              data-test-id="getting-started"
              className="btn btn-primary m-2"
              target="_blank"
              href="https://github.com/algorandfoundation/algokit-cli"
            >
              Getting started
            </a>

            <div className="divider" />

            <button data-test-id="connect-wallet" className="btn m-2 neon-btn" onClick={toggleWalletModal}>
              Connect Wallet
            </button>

            <button data-test-id="transactions-demo" className="btn m-2 neon-btn" onClick={toggleDemoModal}>
              Start Clicking
            </button>

            <button data-test-id="appcalls-demo" className="btn m-2 neon-btn" onClick={toggleAppCallsModal}>
              View Leaderboard
            </button>
          </div>

          <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
          <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
          <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
        </div>
      </div>
    </div>
  )
}

export default Home
