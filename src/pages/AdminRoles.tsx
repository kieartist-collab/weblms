import { useState } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../auth';
import { Action, Empty, Loading, Notice, useLoad } from '../components';
import { check, db } from '../lib';
import type { Profile } from '../types';

export function AdminRoles() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const { data, loading, error, refresh } = useLoad(
    async () => check(await db().from('profiles').select('*').order('email')) as Profile[],
  );
  async function changeRole(person: Profile) {
    const grant = !person.is_admin;
    const detail = grant
      ? 'Người này sẽ có toàn quyền quản lý khóa học, học viên, thanh toán và các quản trị viên khác.'
      : 'Người này sẽ không còn quyền quản trị. Quyền học các khóa đã mua vẫn giữ nguyên.';
    if (
      !window.confirm(
        `${grant ? 'Cấp' : 'Thu hồi'} quyền quản trị cho ${person.email}?\n\n${detail}`,
      )
    )
      return;
    setMessage('');
    const result = await db().rpc('admin_set_role', { p_user: person.id, p_is_admin: grant });
    if (result.error?.code === 'PGRST202' || result.error?.code === '42883') {
      throw new Error(
        'Cần chạy migration 003_admin_roles.sql trong Supabase SQL Editor để bật quản lý quản trị viên.',
      );
    }
    check(result);
    setMessage(`${grant ? 'Đã cấp' : 'Đã thu hồi'} quyền quản trị: ${person.email}.`);
    refresh();
  }
  if (loading) return <Loading />;
  if (error) return <Notice error>{error}</Notice>;
  const admins = data?.filter((p) => p.is_admin) ?? [];
  const query = search.trim().toLocaleLowerCase('vi');
  const matches = query
    ? (data?.filter(
        (p) => !p.is_admin && `${p.email} ${p.full_name}`.toLocaleLowerCase('vi').includes(query),
      ) ?? [])
    : [];
  function personRow(person: Profile) {
    return (
      <div className="admin-role-row" key={person.id}>
        <div>
          <strong>{person.full_name || person.email}</strong>
          <p>{person.email}</p>
        </div>
        {person.id === user?.id ? (
          <span className="badge">Bạn · Admin</span>
        ) : (
          <Action className="button secondary small" onClick={() => changeRole(person)}>
            {person.is_admin ? (
              'Thu hồi quyền admin'
            ) : (
              <>
                <UserPlus size={16} /> Cấp quyền admin
              </>
            )}
          </Action>
        )}
      </div>
    );
  }
  return (
    <section className="admin-roles">
      <h2 className="info-heading">
        <ShieldCheck size={24} /> Quản trị viên
      </h2>
      <p className="muted">
        Admin có toàn quyền quản trị website, bao gồm thêm hoặc gỡ admin khác. Không thể tự thu hồi
        quyền của mình.
      </p>
      {message && <Notice>{message}</Notice>}
      <h3>Đang quản trị ({admins.length})</h3>
      <div>{admins.map(personRow)}</div>
      <h3>Thêm quản trị viên</h3>
      <p className="muted">
        Người nhận cần đăng nhập Google trên website ít nhất một lần. Tìm đúng email của họ để cấp
        quyền.
      </p>
      <label className="field">
        <span>Tìm tài khoản theo email hoặc tên</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nhập email người nhận"
        />
      </label>
      {query &&
        (matches.length ? (
          <div>{matches.map(personRow)}</div>
        ) : (
          <Empty title="Không tìm thấy tài khoản phù hợp" />
        ))}
    </section>
  );
}
