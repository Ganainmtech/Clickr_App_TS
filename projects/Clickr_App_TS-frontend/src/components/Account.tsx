import { useWallet } from '@txnlab/use-wallet-react'

const Account = () => {
  const { activeAddress } = useWallet()

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-cyber-black rounded-lg border border-cyber-purple">
      <h3 className="text-xl font-bold text-cyber-blue mb-2">Connected Account</h3>
      <p className="text-white font-mono text-sm break-all text-center">{activeAddress}</p>
    </div>
  )
}

export default Account
