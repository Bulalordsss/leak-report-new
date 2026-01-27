import { Redirect } from 'expo-router';

export default function Index() {
  // Always start on the login screen; login will redirect to tabs on success
  return <Redirect href="/login" />;
}
