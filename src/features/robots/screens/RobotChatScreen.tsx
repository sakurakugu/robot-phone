import { useRoute } from '@react-navigation/native';
import React from 'react';
import { RobotChatPanel } from '../components/RobotChatPanel';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
};

export function RobotChatScreen() {
  const route = useRoute<any>();
  const { robotUuid, robotName } = (route.params || {}) as RouteParams;

  return (
      <RobotChatPanel robotUuid={robotUuid} robotName={robotName} showStatusHeader={true} />
  );
}
