/**
 * @file main.jsx
 * @description Application entry point - renders root App component
 * @module main
 */

import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Mount the React application to the DOM
createRoot(document.getElementById('root')).render(<App />)

