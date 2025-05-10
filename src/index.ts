import dotenv from 'dotenv'
import { startApp } from './boot/setup'

dotenv.config()

;((): void => {
  try {
    startApp()
  } catch (error: any) {
    console.log('Error in index.ts => startApp')
    console.log(`Error: ${JSON.stringify(error, undefined, 2)}`)
  }
})()
