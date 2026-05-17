import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.3d33dd997b77473c86c5dfd3e20def3a',
  appName: 'studybuddy-ai-spbu',
  webDir: 'dist',
  server: {
    url: 'https://3d33dd99-7b77-473c-86c5-dfd3e20def3a.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed',
    },
  },
};

export default config;
