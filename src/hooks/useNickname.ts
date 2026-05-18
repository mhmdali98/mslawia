import { useStore } from '../store/useStore';

export function useNickname(groupId?: string) {
  const { groups } = useStore();
  const group = groups.find(g => g.id === groupId);
  return (uid: string, fallback: string): string => {
    return group?.nicknames?.[uid]?.trim() || fallback;
  };
}
