# Clickr - A Fun Clicker Game

A simple clicker game availble on desktop or mobile for web2 or web3 players on Algorand. Web3 High Stakes mode is where players can earn rewards for their clicking skills.

## 🎮 How It Works

1. **Play the Game**:
   - Click the moving Algorand logo to score points
   - Each miss costs you a life
   - Game ends when you run out of lives

2. **Choose Your Mode**:
   - **Web2 Mode**: Casual play without blockchain
   - **Web3 Mode**: Connect your Algorand Wallet to play high stakes, highest Clickr Count of the day wins the pot!

3. **Earn Rewards**:
   - Each click in Web3 mode is recorded on-chain
   - A cron "account" job processes clicks and distributes rewards
   - Rewards are calculated based on your score

## 🛠️ Technical Overview

- **Smart Contract**: Records player clicks and manages rewards
- **Cron Job**: Processes clicks and distributes rewards automatically
- **Frontend**: React app with Wallet integration
- **TestNet**: Currently deployed on Algorand TestNet (Do not play it not complete - or play at your own risk, web2 works version works well)

## 🚀 Launching in the Summer

1. Visit the Link [TBA]
2. Connect your Algorand Wallet
3. Choose Web3 mode
4. Start clicking and earning!

> Note: This is a development version on TestNet. Rewards are in test ALGO.

## 🎯 Game Rules

1. Click the moving Algorand logo to score points
2. Each miss reduces your lives
3. Game ends when lives reach zero
4. In Web3 mode, submit your score to the blockchain
5. Compete for top spots on the leaderboard
(A lot more ideas, but one step - or click - at a time ;) )

## 💰 Web3 Mode Details

- **Reward System**:
  - Score multiplier: 0.006 ALGO per click [0.001 Txn fee + 0.005 for rewards pool]
  - Smart contract integration
  - Secure transaction handling

- **Smart Contract**:
  - App ID: {}
  - TestNet deployment
  - Score recording functionality

## 📱 UI/UX

- Modern cyberpunk theme
- Responsive design
- Real-time feedback
- Wallet connection status
- Transaction status indicators
