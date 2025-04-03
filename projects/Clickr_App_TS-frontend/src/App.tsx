import { SupportedWallet, useWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { useState } from 'react'
import { Link, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom'
import { ClickrGame } from './components/ClickrGame'
import ConnectWallet from './components/ConnectWallet'
import Home from './components/Home'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

function NavigationBar({ toggleWalletModal }: { toggleWalletModal: () => void }) {
  const location = useLocation()
  const { activeAddress } = useWallet()
  const isGamePage = location.pathname === '/play'

  return (
    <nav className="bg-gray-900 bg-opacity-80 backdrop-blur-md border-b border-cyber-pink p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold neon-text">
          Clickr
        </Link>
        <div className="flex items-center space-x-6">
          {isGamePage ? (
            <>
              <Link to="/" className="text-xl hover:text-cyber-pink transition-colors">
                🏠
              </Link>
              <button className="text-xl hover:text-cyber-pink transition-colors" id="leaderboard-button">
                📋
              </button>
              <span className="text-lg font-bold text-white">
                🏆{' '}
                <span id="game-score" className="text-white">
                  0
                </span>
              </span>
              <div className="flex items-center space-x-1" id="hearts-container">
                {/* Hearts will be added here by the game component */}
              </div>
              <span
                className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent"
                id="web3-mode-indicator"
              >
                Web3 Mode
              </span>
            </>
          ) : (
            <>
              <Link to="/play" className="px-4 py-2 bg-cyber-pink text-white rounded-lg hover:bg-opacity-80 transition-colors">
                Play Now
              </Link>
              <button
                onClick={toggleWalletModal}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors border border-cyber-pink"
              >
                {activeAddress ? 'Wallet Connected' : 'Connect Wallet'}
              </button>
              {activeAddress && (
                <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                  {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const [openWalletModal, setOpenWalletModal] = useState(false)

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <Router>
          <div className="min-h-screen bg-black">
            <NavigationBar toggleWalletModal={toggleWalletModal} />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/play" element={<ClickrGame />} />
            </Routes>
            <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
          </div>
        </Router>
      </WalletProvider>
    </SnackbarProvider>
  )
}
