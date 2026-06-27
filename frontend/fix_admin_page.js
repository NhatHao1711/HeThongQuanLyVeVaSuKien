const fs = require('fs');
let content = fs.readFileSync('src/app/admin/page.js', 'utf8');

// Add states if missing
if (!content.includes('const [agencies, setAgencies]')) {
  content = content.replace('const [stats, setStats] = useState(null);', 'const [stats, setStats] = useState(null);\n  const [agencies, setAgencies] = useState([]);\n  const [payouts, setPayouts] = useState([]);');
} else if (!content.includes('const [payouts, setPayouts]')) {
  content = content.replace('const [agencies, setAgencies] = useState([]);', 'const [agencies, setAgencies] = useState([]);\n  const [payouts, setPayouts] = useState([]);');
}

// Add tabs if missing
if (!content.includes("{ id: 'agencies'")) {
  content = content.replace("const tabs = [", "const tabs = [\n    { id: 'agencies', label: 'Đại lý' },\n    { id: 'payouts', label: 'Rút tiền' },");
} else if (!content.includes("{ id: 'payouts'")) {
  content = content.replace("const tabs = [", "const tabs = [\n    { id: 'payouts', label: 'Rút tiền' },");
}

// Add auto-load in useEffect
if (!content.includes("loadAgencies();")) {
  content = content.replace("if (activeTab === 'stats' && !revenueStats) {", "if (activeTab === 'agencies' && agencies.length === 0) loadAgencies();\n    if (activeTab === 'payouts' && payouts.length === 0) loadPayouts();\n    if (activeTab === 'stats' && !revenueStats) {");
}

// Add load and action functions
const functions = `
  const loadAgencies = async () => {
    try {
      const res = await apiRequest('/admin/agencies');
      if (res.success) setAgencies(res.data);
    } catch(e) {}
  };
  const handleApproveAgency = async (id) => {
    if(!confirm('Duyệt đại lý này?')) return;
    try {
      const res = await apiRequest(\`/admin/agencies/\${id}/approve\`, { method: 'POST' }); // or PUT? Let's use PUT as usual in Spring
      // Wait, the API for agency might be PUT or POST. We'll use POST
      if(res.success) { showMsg('success', 'Đã duyệt đại lý'); loadAgencies(); }
      else showMsg('error', res.message);
    } catch(e) { showMsg('error', 'Lỗi'); }
  };
  const handleRejectAgency = async (id) => {
    if(!confirm('Từ chối đại lý này?')) return;
    try {
      const res = await apiRequest(\`/admin/agencies/\${id}/reject\`, { method: 'POST' });
      if(res.success) { showMsg('success', 'Đã từ chối đại lý'); loadAgencies(); }
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
                    {agencies.length === 0 && <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>Chưa có dữ liệu</td></tr>}
                    {agencies.map(a => (
                      <tr key={a.id}>
                        <td style={s.td}>#{a.id}<br/><small>{new Date(a.createdAt).toLocaleString('vi-VN')}</small></td>
                        <td style={s.td}><strong>{a.agencyName}</strong><br/><small>{a.user?.email}</small></td>
                        <td style={s.td}>{a.phoneNumber}</td>
                        <td style={s.td}><a href={a.documentUrl} target="_blank" style={{color: '#00B46E', textDecoration: 'none'}}>Xem hồ sơ</a></td>
                        <td style={{ ...s.td, fontWeight: 'bold' }}>{formatMoney(a.user?.balance || 0)}</td>
                        <td style={s.td}>
                          <span style={s.badge(
                            a.status === 'APPROVED' ? '#dcfce7' : a.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                            a.status === 'APPROVED' ? '#15803d' : a.status === 'REJECTED' ? '#991b1b' : '#b45309'
                          )}>{a.status}</span>
                        </td>
                        <td style={s.td}>
                          {a.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => handleApproveAgency(a.id)} style={{...s.btn('#00B46E', '#fff'), padding: '4px 8px'}}>Duyệt</button>
                              <button onClick={() => handleRejectAgency(a.id)} style={{...s.btn('#ef4444', '#fff'), padding: '4px 8px'}}>Từ chối</button>
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

if (!content.includes('activeTab === \'agencies\'')) {
  content = content.replace('{/* DASHBOARD */}', uiBlocks + '\n\n          {/* DASHBOARD */}');
} else if (!content.includes('activeTab === \'payouts\'')) {
  // if agencies exists but payouts doesn't (though agencies doesn't currently)
  content = content.replace('{/* DASHBOARD */}', uiBlocks + '\n\n          {/* DASHBOARD */}');
}

fs.writeFileSync('src/app/admin/page.js', content);
