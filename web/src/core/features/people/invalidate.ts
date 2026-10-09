import type { QueryClient } from '@tanstack/react-query';
import { BOOTSTRAP_KEY, MEMBERS_KEY, TEAMS_KEY, TEAM_KEY_PREFIX } from '../../queryKeys';

/** Sau mọi thay đổi về Tổ, thành viên, tài khoản: làm mới mọi nơi đang hiện các dữ liệu đó. */
export function invalidatePeople(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: TEAMS_KEY }),
    queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
    queryClient.invalidateQueries({ queryKey: TEAM_KEY_PREFIX }),
    queryClient.invalidateQueries({ queryKey: BOOTSTRAP_KEY }),
  ]);
}
