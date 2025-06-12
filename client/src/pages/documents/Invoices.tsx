import { FileText } from 'lucide-react';
import DocumentPage from './DocumentPage';

export default function Invoices() {
  return (
    <DocumentPage documentType="invoice" title="Invoices" icon={FileText} />
  );
}
