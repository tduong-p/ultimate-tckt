import { useQuery } from '@tanstack/react-query';
import { fetchSession, type SessionUser } from '../../api';
import { SESSION_KEY } from '../../queryKeys';

/** Người đang đăng nhập (đọc cache session). Dùng để ẩn nút "xoá chính mình". */
export function useCurrentUser(): SessionUser | null {
  const { data } = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession });
  return data?.user ?? null;
}
