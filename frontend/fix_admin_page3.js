const fs = require('fs');
let content = fs.readFileSync('src/app/admin/page.js', 'utf8');

// Add states if missing
if (!content.includes('const [agencies, setAgencies]')) {
  content = content.replace('const [stats, setStats] = useState(null);', 'const [stats, setStats] = useState(null);\n  const [agencies, setAgencies] = useState([]);\n  const [approvedAgencies, setApprovedAgencies] = useState([]);\n  const [agencyTab, setAgencyTab] = useState(\'pending\');\n  const [payouts, setPayouts] = useState([]);');
}

// Add tabs if missing
if (!content.includes("{ id: 'agencies'")) {
  content = content.replace("const tabs = [", "const tabs = [\n    { id: 'agencies', label: 'Đại lý' },\n    { id: 'payouts', label: 'Rút tiền' },");
}

// Add auto-load in useEffect
if (!content.includes("loadAgencies();")) {
  content = content.replace("if (activeTab === 'stats' && !revenueStats) {", "if (activeTab === 'agencies' && agencies.length === 0 && approvedAgencies.length === 0) loadAgencies();\n    if (activeTab === 'payouts' && payouts.length === 0) loadPayouts();\n    if (activeTab === 'stats' && !revenueStats) {");
}

// Add load and action functions
const functions = `
  const loadAgencies = async () => {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        apiRequest('/admin/organizers/requests'),
        apiRequest('/admin/organizers/requests/approved')
      ]);
      if (pendingRes.success) setAgencies(pendingRes.data);
      if (approvedRes.success) setApprovedAgencies(approvedRes.data);
    } catch(e) {}
  };
  const handleApproveAgency = async (id) => {
    if(!confirm('Duyệt đại lý này?')) return;
    try {
      const res = await apiRequest(\`/admin/organizers/requests/\${id}/approve\`, { method: 'POST' });
      if(res.success) { showMsg('success', 'Đã duyệt đại lý'); loadAgencies(); }
      else showMsg('error', res.message);
    } catch(e) { showMsg('error', 'Lỗi'); }
  };
  const handleRejectAgency = async (id) => {
    if(!confirm('Từ chối đại lý này?')) return;
    try {
      const res = await apiRequest(\`/admin/organizers/requests/\${id}/reject\`, { method: 'POST' });
      if(res.success) { showMsg('success', 'Đã từ chối đại lý'); loadAgencies(); }
      else showMsg('error', res.message);
    } catch(e) { showMsg('error', 'Lỗi'); }
  };
  const handleBlockAgency = async (id) => {
    if(!confirm('Khóa đại lý này? Tài khoản này sẽ bị thu hồi quyền đại lý.')) return;
    try {
      const res = await apiRequest(\`/admin/organizers/requests/\${id}/block\`, { method: 'POST' });
      if(res.success) { showMsg('success', 'Đã khóa đại lý'); loadAgencies(); }
      else showMsg('error', res.message);
    } catch(e) { showMsg('error', 'Lỗi'); }
  };
  const handleUnblockAgency = async (id) => {
    if(!confirm('Kích hoạt lại đại lý này?')) return;
    try {
      const res = await apiRequest(\`/admin/organizers/requests/\${id}/unblock\`, { method: 'POST' });
      if(res.success) { showMsg('success', 'Đã kích hoạt lại đại lý'); loadAgencies(); }
      else showMsg('error', res.message);
    } catch(e) { showMsg('error', 'Lỗi'); }
  };

  const loadPayouts = async () => {
    try {
      const res = await apiRequest('/admin/payouts');
      if (res.success) setPayouts(res.data);
    } catch(e) {}
  };
  const handleApprovePayout = async (id) => {
    if(!confirm('Xác nhận đã chuyển khoản cho yêu cầu này?')) return;
    try {
      const res = await apiRequest(\`/admin/payouts/\${id}/approve\`, { method: 'POST' });
      if(res.success) { showMsg('success', res.message); loadPayouts(); }
      else showMsg('error', res.message);
    } catch(e) { showMsg('error', 'Lỗi kết nối'); }
  };
  const handleRejectPayout = async (id) => {
    if(!confirm('Từ chối yêu cầu và hoàn tiền lại cho đại lý?')) return;
    try {
      const res = await apiRequest(\`/admin/payouts/\${id}/reject\`, { method: 'POST' });
      if(res.success) { showMsg('success', res.message); loadPayouts(); }
      else showMsg('error', res.message);
    } catch(e) { showMsg('error', 'Lỗi kết nối'); }
  };
`;

if (!content.includes('const loadAgencies =')) {
  content = content.replace('const loadAll = async () => {', functions + '\n  const loadAll = async () => {');
}

// Add UI Blocks
const uiBlocks = `
          {/* AGENCIES */}
          {activeTab === 'agencies' && (
            <>
              <div style={s.header}>
                <h1 style={s.headerTitle}>Quản lý đại lý</h1>
                <p style={s.headerDesc}>Duyệt và xem danh sách đại lý (Organizer)</p>
              </div>

              {/* Sub tabs */}
              <div style={{ display: 'flex', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setAgencyTab('pending')}
                  style={s.subTab(agencyTab === 'pending')}
                >
                  Yêu cầu chờ duyệt ({agencies.length})
                </button>
                <button
                  onClick={() => setAgencyTab('active')}
                  style={s.subTab(agencyTab === 'active')}
                >
                  Đại lý hoạt động ({approvedAgencies.length})
                </button>
              </div>

              <div className="table-responsive" style={s.card}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>ID / Ngày ĐK</th>
                      <th style={s.th}>Đại lý</th>
                      <th style={s.th}>Số điện thoại</th>
                      <th style={s.th}>Giấy tờ</th>
                      <th style={s.th}>Số dư</th>
                      <th style={s.th}>Trạng thái</th>
                      <th style={s.th}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(agencyTab === 'pending' ? agencies : approvedAgencies).length === 0 && (
                      <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>Chưa có dữ liệu</td></tr>
                    )}
                    {(agencyTab === 'pending' ? agencies : approvedAgencies).map(a => (
                      <tr key={a.id}>
                        <td style={s.td}>#{a.id}<br/><small>{new Date(a.createdAt).toLocaleString('vi-VN')}</small></td>
                        <td style={s.td}><strong>{a.organizationName}</strong><br/><small>{a.user?.email || a.contactEmail}</small></td>
                        <td style={s.td}>{a.contactPhone}</td>
                        <td style={s.td}><a href={a.documentUrl} target="_blank" style={{color: '#00B46E', textDecoration: 'none'}}>Xem hồ sơ</a></td>
                        <td style={{ ...s.td, fontWeight: 'bold' }}>{formatMoney(a.user?.balance || 0)}</td>
                        <td style={s.td}>
                          <span style={s.badge(
                            a.status === 'APPROVED' ? '#dcfce7' : a.status === 'REJECTED' ? '#fee2e2' : a.status === 'BLOCKED' ? '#f1f5f9' : '#fef3c7',
                            a.status === 'APPROVED' ? '#15803d' : a.status === 'REJECTED' ? '#991b1b' : a.status === 'BLOCKED' ? '#64748b' : '#b45309'
                          )}>{a.status === 'APPROVED' ? 'Đang hoạt động' : a.status === 'BLOCKED' ? 'Đang khóa' : a.status === 'PENDING' ? 'Chờ duyệt' : a.status}</span>
                        </td>
                        <td style={s.td}>
                          {a.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => handleApproveAgency(a.id)} style={{...s.btn('#00B46E', '#fff'), padding: '4px 8px'}}>Duyệt</button>
                              <button onClick={() => handleRejectAgency(a.id)} style={{...s.btn('#ef4444', '#fff'), padding: '4px 8px'}}>Từ chối</button>
                            </div>
                          )}
                          {a.status === 'APPROVED' && (
                            <button onClick={() => handleBlockAgency(a.id)} style={{...s.btn('#ef4444', '#fff'), padding: '4px 8px'}}>Khóa</button>
                          )}
                          {a.status === 'BLOCKED' && (
                            <button onClick={() => handleUnblockAgency(a.id)} style={{...s.btn('#00B46E', '#fff'), padding: '4px 8px'}}>Mở khóa</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* PAYOUTS */}
          {activeTab === 'payouts' && (
            <>
              <div style={s.header}>
                <h1 style={s.headerTitle}>Yêu cầu rút tiền</h1>
                <p style={s.headerDesc}>Duyệt yêu cầu rút tiền từ đại lý</p>
              </div>
              <div className="table-responsive" style={s.card}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Mã</th>
                      <th style={s.th}>Đại lý</th>
                      <th style={s.th}>Số tiền</th>
                      <th style={s.th}>Ngân hàng</th>
                      <th style={s.th}>Thời gian</th>
                      <th style={s.th}>Trạng thái</th>
                      <th style={s.th}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 && (
                      <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#a0aec0' }}>Không có yêu cầu nào</td></tr>
                    )}
                    {payouts.map(p => (
                      <tr key={p.id}>
                        <td style={s.td}>#{p.payoutRef}</td>
                        <td style={s.td}>
                          <div><strong>{p.agencyName}</strong></div>
                          <div style={{fontSize: '0.8rem', color: '#64748b'}}>{p.agencyEmail}</div>
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: '#0ea5e9' }}>
                          {formatMoney(p.netAmount)}
                        </td>
                        <td style={s.td}>
                          <div><strong>{p.bankName}</strong></div>
                          <div style={{fontSize: '0.85rem'}}>{p.bankAccountNumber}</div>
                          <div style={{fontSize: '0.8rem', color: '#64748b'}}>{p.bankAccountName}</div>
                        </td>
                        <td style={s.td}>
                          {new Date(p.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td style={s.td}>
                          <span style={{
                            padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                            background: p.status === 'COMPLETED' ? '#dcfce3' : p.status === 'FAILED' ? '#fee2e2' : '#fef3c7',
                            color: p.status === 'COMPLETED' ? '#166534' : p.status === 'FAILED' ? '#991b1b' : '#b45309'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={s.td}>
                          {p.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => handleApprovePayout(p.id)} style={{ ...s.btn('#00B46E', '#fff'), padding: '6px 12px', fontSize: '0.8rem' }}>Duyệt</button>
                              <button onClick={() => handleRejectPayout(p.id)} style={{ ...s.btn('#ef4444', '#fff'), padding: '6px 12px', fontSize: '0.8rem' }}>Từ chối</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
`;

if (!content.includes('Quản lý đại lý')) {
  content = content.replace('{/* DASHBOARD */}', uiBlocks + '\n\n          {/* DASHBOARD */}');
}

// And redesign the tabs to have icons
content = content.replace("const tabs = [", "const tabs = [");
content = content.replace("{ id: 'agencies', label: 'Đại lý' },", "{ id: 'agencies', label: 'Đại lý', icon: icons.shield(18) },");
content = content.replace("{ id: 'payouts', label: 'Rút tiền' },", "{ id: 'payouts', label: 'Rút tiền', icon: icons.creditCard(18) },");
content = content.replace("{ id: 'dashboard', label: 'Tổng quan' },", "{ id: 'dashboard', label: 'Tổng quan', icon: icons.zap(18) },");
content = content.replace("{ id: 'events', label: 'Sự kiện' },", "{ id: 'events', label: 'Sự kiện', icon: icons.calendar(18) },");
content = content.replace("{ id: 'users', label: 'Người dùng' },", "{ id: 'users', label: 'Người dùng', icon: icons.users(18) },");
content = content.replace("{ id: 'orders', label: 'Đơn hàng' },", "{ id: 'orders', label: 'Đơn hàng', icon: icons.clipboardList(18) },");
content = content.replace("{ id: 'stats', label: 'Thống kê' },", "{ id: 'stats', label: 'Thống kê', icon: icons.search(18) },");
content = content.replace("{ id: 'vouchers', label: 'Voucher' },", "{ id: 'vouchers', label: 'Voucher', icon: icons.ticket(18) },");

// We need to use Regex since there are spaces
content = content.replace(/{tabs\.map\(t => \(\s*<button key={t\.id} onClick={\(\) => setActiveTab\(t\.id\)} style={s\.navItem\(activeTab === t\.id\)}>\s*{t\.label}\s*<\/button>\s*\)\)}/g, 
`{tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={s.navItem(activeTab === t.id)}>
              <div style={{display: 'flex', alignItems: 'center', width: 24, justifyContent: 'center'}}>{t.icon}</div> 
              <span style={{marginLeft: 4, fontWeight: activeTab === t.id ? 700 : 500}}>{t.label}</span>
            </button>
          ))}`);


// Update sidebar styling to be more modern
content = content.replace("sidebar: { width: 240, background: '#fff', borderRight: '1px solid #e2e8f0', padding: '1.5rem 0', flexShrink: 0, position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto' },", 
"sidebar: { width: 260, background: '#fff', borderRight: '1px solid #e2e8f0', padding: '1.5rem 0.5rem', flexShrink: 0, position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' },");

content = content.replace("navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 1.2rem', fontSize: '0.88rem', fontWeight: active ? 600 : 400, color: active ? '#00B46E' : '#4a5568', background: active ? 'rgba(0,180,110,0.06)' : 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: active ? '3px solid #00B46E' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.15s', width: '100%', textAlign: 'left', fontFamily: 'inherit' }),",
"navItem: (active) => ({ display: 'flex', alignItems: 'center', padding: '12px 1rem', margin: '4px 0', fontSize: '0.95rem', color: active ? '#00B46E' : '#64748b', background: active ? '#f0fdf4' : 'transparent', border: 'none', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease', width: '100%', textAlign: 'left', fontFamily: 'inherit' }),");

// Insert subTab styling helper into s
content = content.replace(
  "ticketRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' },",
  "ticketRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' },\n    subTab: (active) => ({ padding: '8px 16px', background: active ? '#00B46E' : 'transparent', color: active ? '#fff' : '#64748b', border: '1px solid ' + (active ? '#00B46E' : '#e2e8f0'), borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', marginRight: 8, fontFamily: 'inherit' }),"
);

fs.writeFileSync('src/app/admin/page.js', content);
console.log('Successfully updated src/app/admin/page.js!');
