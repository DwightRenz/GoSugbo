import { Image } from 'react-native';

export default function BackArrow() {
  return (
    <Image
      source={require('../../../assets/home/Left_Arrow.png')}
      style={{ width: 22, height: 22 }}
      resizeMode="contain"
      accessible={false}
    />
  );
}
