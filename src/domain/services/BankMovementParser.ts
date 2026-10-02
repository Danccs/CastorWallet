import type { BankMovement, BankMovementType } from '../entities/BankMovement';

export interface ParseBankResult {
  movements: BankMovement[];
  detectedPeriod?: string; // YYYY-MM
  accountNumber?: string;
  clientName?: string;
  totalCargos?: number;
  totalAbonos?: number;
}

export class BankMovementParser {
  /**
   * Cleans and parses a monetary string formatted like "-20.980", "1.652.408", "0", "-493".
   */
  private static parseAmount(str: string): number {
    if (!str) return 0;
    // Remove $, spaces, and dots
    const cleaned = str.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Parses extracted lines from a bank PDF into structured BankMovements.
   */
  static parseLines(lines: string[]): ParseBankResult {
    const movements: BankMovement[] = [];
    let detectedPeriod: string | undefined;
    let accountNumber: string | undefined;
    let clientName: string | undefined;

    // First pass: extract header metadata
    for (const line of lines) {
      // Look for account number
      const accMatch = line.match(/(?:CuentaRUT|Cuenta Corriente|N°|Cuenta)\s*(?:N°)?\s*(\d{8,15})/i);
      if (accMatch && !accountNumber) {
        accountNumber = accMatch[1];
      }

      // Look for statement date e.g. "Fecha Estado de Cuenta 30/09/2026"
      const dateHeaderMatch = line.match(/Fecha(?:\s+Estado\s+de\s+Cuenta)?\s*:?\s*(\d{2})[/.-](\d{2})[/.-](\d{4})/i);
      if (dateHeaderMatch && !detectedPeriod) {
        const [, , month, year] = dateHeaderMatch;
        detectedPeriod = `${year}-${month}`;
      }

      // Look for client name (either after Nombre, or before a Chilean RUT e.g. "Daniel Rodriguez Ascanio 25139570-5")
      const rutMatch = line.match(/^([A-Za-zÁÉÍÓÚñáéíóú\s]{3,40})\s+(\d{7,9}-[\dkK])/i);
      if (rutMatch && !clientName) {
        clientName = rutMatch[1].trim();
      }

      const nameMatch = line.match(/Nombre\s*:?\s*([A-Za-zÁÉÍÓÚñáéíóú\s]{3,30})\s+RUT/i);
      if (nameMatch && !clientName) {
        clientName = nameMatch[1].trim();
      }
    }

    // Date pattern at the start of a transaction row: DD/MM/YYYY
    const dateRowRegex = /^(\d{2})[/.-](\d{2})[/.-](\d{4})\s+(.*)$/;

    // Pre-process: merge wrapped lines into single movement row lines
    const rawMovementBlocks: string[] = [];
    let currentBlock: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Ignore known non-movement table headers and footers
      if (
        line.startsWith('Fecha N° Operación') ||
        line.startsWith('Fecha Operación') ||
        line.startsWith('Subtotales') ||
        line.startsWith('Notas:') ||
        line.startsWith('Información referencial') ||
        line.startsWith('Saldo y Retenciones') ||
        line.startsWith('Datos del cliente') ||
        line.startsWith('Últimos Movimientos')
      ) {
        continue;
      }

      const matchDate = line.match(dateRowRegex);
      if (matchDate) {
        // Line starts with a date -> starts a new transaction block
        if (currentBlock) {
          rawMovementBlocks.push(currentBlock);
        }
        currentBlock = line;
      } else if (currentBlock) {
        // Continuation of current block (multi-line descriptions)
        currentBlock += ' ' + line;
      }
    }

    if (currentBlock) {
      rawMovementBlocks.push(currentBlock);
    }

    // Second pass: parse each movement block
    let itemIndex = 0;
    for (const block of rawMovementBlocks) {
      const dateMatch = block.match(dateRowRegex);
      if (!dateMatch) continue;

      const [, day, month, year, restOfLine] = dateMatch;
      const dateStr = `${year}-${month}-${day}`;
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);

      if (!detectedPeriod) {
        detectedPeriod = `${year}-${month}`;
      }

      // Extract trailing amounts
      // Patterns in Chilean banks:
      // BancoEstado format: [Cargo] [Abono] [Saldo]
      // E.g. "... -20.980 0 423.022" or "... 0 1.652.408 2.075.430"
      // or 2 numbers: [Cargo/Abono] [Saldo]
      // or 1 number: [Cargo/Abono]
      const numbersAtEndRegex = /(-?\$?\s*[\d.]+(?:,\d+)?)\s+(-?\$?\s*[\d.]+(?:,\d+)?)(?:\s+(-?\$?\s*[\d.]+(?:,\d+)?))?\s*$/;
      const numMatch = restOfLine.match(numbersAtEndRegex);

      if (!numMatch) {
        continue;
      }

      const fullMatch = numMatch[0];
      const middleText = restOfLine.substring(0, restOfLine.length - fullMatch.length).trim();

      const num1Str = numMatch[1];
      const num2Str = numMatch[2];
      const num3Str = numMatch[3]; // optional saldo

      const val1 = this.parseAmount(num1Str);
      const val2 = this.parseAmount(num2Str);
      const val3 = num3Str ? this.parseAmount(num3Str) : undefined;

      let amount = 0;
      let type: BankMovementType = 'expense';
      let balance: number | undefined = val3;

      if (num3Str !== undefined) {
        // Format with 3 numbers: [Cargo, Abono, Saldo]
        if (val1 !== 0) {
          amount = Math.abs(val1);
          type = 'expense';
        } else if (val2 !== 0) {
          amount = Math.abs(val2);
          type = 'income';
        } else {
          // Both 0? unusual, skip or treat as 0
          continue;
        }
      } else {
        // Format with 2 numbers: could be [Cargo, Abono] or [Amount, Saldo]
        if (val1 < 0) {
          amount = Math.abs(val1);
          type = 'expense';
          balance = val2;
        } else if (val1 > 0 && val2 === 0) {
          amount = val1;
          type = 'income';
        } else if (val1 === 0 && val2 > 0) {
          amount = val2;
          type = 'income';
        } else {
          amount = Math.abs(val1);
          type = val1 < 0 ? 'expense' : 'income';
          balance = val2;
        }
      }

      if (amount <= 0) continue;

      // Extract operation number if present at the start of middleText
      // E.g. "8038352 ABONO CONVENIO BANCO DE CREDITO E I"
      let operationNumber: string | undefined;
      let description = middleText;

      const opMatch = middleText.match(/^(\d{5,12})\s+(.*)$/);
      if (opMatch) {
        operationNumber = opMatch[1];
        description = opMatch[2].trim();
      }

      itemIndex++;
      const id = operationNumber ? `bank-${operationNumber}` : `bank-${dateStr}-${itemIndex}`;

      movements.push({
        id,
        date: dateObj,
        dateStr,
        operationNumber,
        description: description.replace(/\s+/g, ' '),
        amount: Math.round(amount),
        type,
        balance,
        rawText: block
      });
    }

    return {
      movements,
      detectedPeriod,
      accountNumber,
      clientName,
      totalCargos: movements.filter(m => m.type === 'expense').reduce((sum, m) => sum + m.amount, 0),
      totalAbonos: movements.filter(m => m.type === 'income').reduce((sum, m) => sum + m.amount, 0)
    };
  }
}
