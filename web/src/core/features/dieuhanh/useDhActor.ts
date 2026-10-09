import { useQuery } from '@tanstack/react-query';
import { fetchSession } from '../../api';
import { useCapabilities } from '../../capabilities';
import { SESSION_KEY } from '../../queryKeys';
import { deriveDhActor, type DhActor } from './permissions';

export function useDhActor(): DhActor {
  const caps = useCapabilities();
  const { data: session } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession });
  return deriveDhActor(caps, session?.user?.id ?? null);
}
