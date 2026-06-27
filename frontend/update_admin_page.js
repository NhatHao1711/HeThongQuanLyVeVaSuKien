const fs = require('fs');
let content = fs.readFileSync('src/app/admin/page.js', 'utf8');

// Add state
content = content.replace('const [agencies, setAgencies] = useState([]);', 'const [agencies, setAgencies] = useState([]);\n  const [payouts, setPayouts] = useState([]);');

// Add to tabs array
content = content.replace('const tabs = [', 'const tabs = [\n    { id: \'payouts\', label: \'Rút tiền\' },');

// Add activeTab check in useEffect
content = content.replace('if (activeTab === \'agencies\') {', 'if (activeTab === \'payouts\') {\n      loadPayouts();\n    }\n    if (activeTab === \'agencies\') {');

// Add loadPayouts, approvePayout, rejectPayout functions
const functions = `
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
content = content.replace('const loadAgencies = async () => {', functions + '\n  const loadAgencies = async () => {');

// Add the payouts tab rendering logic right before the AGENCIES tab
const payoutRender = `
          {/* PAYOUTS */}
          {activeTab === 'payouts' && (
            <>
              <div style={s.header}>
                <h1 style={s.headerTitle}>Yêu cầu rút tiền</h1>
                <p style={s.headerDesc}>Duyệt và xác nhận các yêu cầu rút tiền từ đại lý</p>
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
content = content.replace('{/* AGENCIES */}', payoutRender + '\n          {/* AGENCIES */}');

fs.writeFileSync('src/app/admin/page.js', content);
