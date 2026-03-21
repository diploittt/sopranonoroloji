import { Slot } from 'expo-router';
import AppBackground from '../../components/shared/AppBackground';

export default function TenantAdminLayout() {
  return (
    <AppBackground>
      <Slot />
    </AppBackground>
  );
}
