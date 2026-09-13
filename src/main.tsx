import React from 'react';import ReactDOM from 'react-dom/client';import V9App from './V9App';import './styles.css';import { registerSW } from 'virtual:pwa-register';

if('serviceWorker' in navigator){
 let reloaded=false
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(reloaded)return
  reloaded=true
  window.location.reload()
 })
}
const updateSW=registerSW({immediate:true})
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updateSW()})

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><V9App/></React.StrictMode>);
