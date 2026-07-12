// يوتيليتي مشتركة لطباعة الروشتة - مستخدمة من مودال الروشتة (بعد الحفظ)
// وكمان من صفحة البريسكربشن الرئيسية (زرار Print جنب Edit)
export interface PrintableMedication {
  name?: string;
  dosageAmount?: number | string;
  dosageUnit?: string;
  dose?: string; // نسخة جاهزة من صفحة الليستة (زي "500mg")
  frequencyCount?: number | string;
  frequencyPeriod?: string;
  frequency?: string; // نسخة جاهزة من صفحة الليستة (زي "2x per day")
  durationValue?: number | string;
  durationUnit?: string;
  duration?: string; // نسخة جاهزة من صفحة الليستة
  isChronic?: boolean;
}

export function printPrescription(
  patientName: string,
  medications: PrintableMedication[],
  date: Date = new Date(),
): void {
  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) return;

  const rows = (medications || [])
    .map((m) => {
      const dose = m.dose || (m.dosageAmount && m.dosageUnit ? `${m.dosageAmount}${m.dosageUnit}` : '—');
      const freq =
        m.frequency || (m.frequencyCount && m.frequencyPeriod ? `${m.frequencyCount}x ${m.frequencyPeriod}` : '—');
      const duration = m.isChronic
        ? 'Chronic (ongoing)'
        : m.duration || (m.durationValue && m.durationUnit ? `${m.durationValue} ${m.durationUnit}` : '—');
      return `
        <tr>
          <td>${m.name || ''}</td>
          <td>${dose}</td>
          <td>${freq}</td>
          <td>${duration}</td>
        </tr>
      `;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <title>Prescription — ${patientName}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #1f2937; }
          h1 { font-size: 20px; color: #1976d2; margin: 0 0 4px; }
          .subtitle { font-size: 12px; color: #6b7280; margin: 0 0 20px; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
          th { background: #f3f4f6; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>MedAgents</h1>
        <p class="subtitle">Prescription</p>
        <div class="meta">
          <span><strong>Patient:</strong> ${patientName || '—'}</span>
          <span><strong>Date:</strong> ${date.toLocaleDateString()}</span>
        </div>
        <table>
          <thead>
            <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
