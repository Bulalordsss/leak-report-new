import { Redirect } from 'expo-router';

export default function Index() {
  // Layout handles token checking, just redirect to tabs
  return <Redirect href="/(tabs)" />;
}
