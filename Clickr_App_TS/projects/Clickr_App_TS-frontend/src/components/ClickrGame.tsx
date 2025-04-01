const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

// Check if the user is opted into the app
const checkOptIn = async () => {
  if (!activeAddress) return false

  setIsCheckingOptIn(true)

  try {
    // Fetch account info to check if opted into app
    const response = await fetch(`${API_BASE_URL}/api/account-info?address=${activeAddress}`)
    if (!response.ok) throw new Error('Failed to fetch account info')

    const accountInfo = await response.json()

    // Check if account is opted into the app
    const appOptedIn = accountInfo.account?.appsLocalState?.some((app: App) => BigInt(app.id) === BigInt(APP_ID)) || false

    setIsOptedIn(appOptedIn)
    return appOptedIn
  } catch (error) {
    console.error('Error checking opt-in status:', error)
    return false
  } finally {
    setIsCheckingOptIn(false)
  }
}

// Opt into the app
const optInToApp = async () => {
  if (!activeAddress) return

  setIsOptingIn(true)
  setTxnStatus('pending')

  try {
    // Request opt-in transaction from API
    const response = await fetch(`${API_BASE_URL}/api/opt-in-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: activeAddress,
        appId: APP_ID,
      }),
    })

    if (!response.ok) throw new Error('Failed to create opt-in transaction')

    const { unsignedTxn } = await response.json()

    // Sign the transaction
    const signedTxns = await signTransactions([unsignedTxn])

    // Submit the signed transaction
    const submitResponse = await fetch(`${API_BASE_URL}/api/submit-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedTxn: signedTxns[0],
      }),
    })

    if (!submitResponse.ok) throw new Error('Failed to submit opt-in transaction')

    setIsOptedIn(true)
    setTxnStatus('success')

    // Wait a moment and then start the game
    setTimeout(() => {
      startWeb3Game()
    }, 1500)
  } catch (error) {
    console.error('Opt-in error:', error)
    setTxnStatus('error')
  } finally {
    setIsOptingIn(false)
  }
}

// Handle click action
const handleClick = async () => {
  if (!activeAddress || !isOptedIn) return

  try {
    const response = await fetch(`${API_BASE_URL}/api/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: activeAddress,
      }),
    })

    if (!response.ok) throw new Error('Failed to create click transaction')

    const { unsignedTxn } = await response.json()

    // Sign the transaction
    const signedTxns = await signTransactions([unsignedTxn])

    // Submit the signed transaction
    await fetch(`${API_BASE_URL}/api/submit-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedTxn: signedTxns[0],
      }),
    })

    // Update click count
    const countResponse = await fetch(`${API_BASE_URL}/api/click-count?address=${activeAddress}`)
    if (!countResponse.ok) throw new Error('Failed to fetch click count')
    const { clickCount } = await countResponse.json()
    setClicks(clickCount)
  } catch (error) {
    console.error('Click error:', error)
  }
}

// Handle payment
const handlePayment = async () => {
  if (!activeAddress) return

  try {
    const response = await fetch(`
