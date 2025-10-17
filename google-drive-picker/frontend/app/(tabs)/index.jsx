import { StyleSheet, View } from 'react-native';
import DrivePicker from '../../components/DrivePicker';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <DrivePicker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});