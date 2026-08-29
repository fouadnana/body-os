import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {VitePWA} from 'vite-plugin-pwa'

export default defineConfig({
  base:'/body-os/',
  plugins:[
    react(),
    VitePWA({
      registerType:'autoUpdate',
      manifest:{
        name:'BODY OS — AI CUT',
        short_name:'BODY OS',
        description:'Coach adaptatif musculation, nutrition, progression et L5-S1.',
        theme_color:'#081522',
        background_color:'#081522',
        display:'standalone',
        start_url:'./'
      }
    })
  ],
  build:{
    rollupOptions:{
      output:{
        manualChunks(id){
          if(!id.includes('node_modules')) return
          if(id.includes('/react/')||id.includes('/react-dom/')||id.includes('/scheduler/')) return 'react-vendor'
          if(id.includes('/recharts/')||id.includes('/d3-')||id.includes('/victory-vendor/')||id.includes('/internmap/')) return 'charts-vendor'
          return 'vendor'
        }
      }
    }
  }
})
