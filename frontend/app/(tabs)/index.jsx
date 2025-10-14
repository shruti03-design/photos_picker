import { StyleSheet, View } from 'react-native';
import PhotosPicker from '../../components/PhotosPicker';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <PhotosPicker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});