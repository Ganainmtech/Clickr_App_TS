import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import Account from './Account'

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeAddress } = useWallet()

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form
        method="dialog"
        className="modal-box p-8 rounded-lg bg-black bg-opacity-60 backdrop-blur-lg shadow-neon border border-cyber-pink"
      >
        <h3 className="text-3xl font-extrabold text-cyber-blue neon-text mb-6">Select Wallet Provider</h3>

        <div className="grid space-y-4">
          {activeAddress && (
            <>
              <Account />
              <div className="divider border-cyber-purple" />
            </>
          )}

          {!activeAddress &&
            wallets?.map((wallet) => (
              <button
                data-test-id={`${wallet.id}-connect`}
                className="btn neon-btn m-2 flex items-center space-x-4 border-cyber-purple bg-cyber-black hover:bg-cyber-blue text-white transition-all"
                key={`provider-${wallet.id}`}
                onClick={() => {
                  return wallet.connect()
                }}
              >
                {!isKmd(wallet) && <img alt={`wallet_icon_${wallet.id}`} src={wallet.metadata.icon} className="w-8 h-8 object-contain" />}
                <span className="text-lg font-semibold">{isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}</span>
              </button>
            ))}
        </div>

        <div className="modal-action flex justify-between">
          <button
            data-test-id="close-wallet-modal"
            className="btn neon-btn bg-transparent text-cyber-pink hover:text-white border-cyber-pink"
            onClick={() => {
              closeModal()
            }}
          >
            Close
          </button>
          {activeAddress && (
            <button
              className="btn neon-btn bg-cyber-pink hover:bg-cyber-blue text-black"
              data-test-id="logout"
              onClick={async () => {
                if (wallets) {
                  const activeWallet = wallets.find((w) => w.isActive)
                  if (activeWallet) {
                    await activeWallet.disconnect()
                  } else {
                    localStorage.removeItem('@txnlab/use-wallet:v3')
                    window.location.reload()
                  }
                }
              }}
            >
              Logout
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
export default ConnectWallet
