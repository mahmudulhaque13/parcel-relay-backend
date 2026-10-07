import PDFDocument from 'pdfkit';

interface IInvoicePdfData {
  invoiceNumber: string;
  shipmentId: string;
  customerName: string;
  customerEmail: string;
  recipientName: string;
  deliveryAddress: string;
  weight: number;
  codAmount: number;
  deliveryCharge: number;
  paymentStatus: string;
  transactionId: string;
  createdAt: Date;
}

const generateInvoicePdf = async (data: IInvoicePdfData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    try {
      doc.fontSize(24).font('Helvetica-Bold').text('ParcelRelay', { align: 'center' });

      doc.moveDown(0.5).fontSize(18).text('INVOICE', { align: 'center' });

      doc.moveDown();

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice Number: ${data.invoiceNumber}`)
        .text(`Invoice Date: ${data.createdAt.toLocaleDateString()}`)
        .text(`Transaction ID: ${data.transactionId}`);

      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold').text('Customer Information');

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${data.customerName}`)
        .text(`Email: ${data.customerEmail}`);

      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold').text('Shipment Information');

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Shipment ID: ${data.shipmentId}`)
        .text(`Recipient: ${data.recipientName}`)
        .text(`Delivery Address: ${data.deliveryAddress}`)
        .text(`Weight: ${data.weight} kg`)
        .text(`COD Amount: BDT ${data.codAmount.toFixed(2)}`);

      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold').text('Payment Summary');

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Delivery Charge: BDT ${data.deliveryCharge.toFixed(2)}`)
        .text(`Payment Status: ${data.paymentStatus}`)
        .text(`Total Paid: BDT ${data.deliveryCharge.toFixed(2)}`);

      doc.moveDown(2);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Thank you for using ParcelRelay.', { align: 'center' });

      doc.moveDown(0.5).text('This is a system-generated invoice.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const invoicePdfUtils = {
  generateInvoicePdf,
};
