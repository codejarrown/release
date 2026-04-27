import { describe, expect, it } from 'vitest';
import { generateMachineLicense, normalizeMachineId, verifyMachineLicense } from './machine-license.js';
const SECRET = 'license-signing-secret';
describe('machine-license', () => {
    it('normalizes machineId before generating license', () => {
        const a = generateMachineLicense('PC-001', SECRET);
        const b = generateMachineLicense('  pc-001  ', SECRET);
        expect(a).toBe(b);
    });
    it('verifies generated license', () => {
        const machineId = 'user-device-01';
        const license = generateMachineLicense(machineId, SECRET);
        expect(verifyMachineLicense(machineId, license, SECRET)).toBe(true);
    });
    it('rejects mismatched machineId or secret', () => {
        const license = generateMachineLicense('user-device-01', SECRET);
        expect(verifyMachineLicense('user-device-02', license, SECRET)).toBe(false);
        expect(verifyMachineLicense('user-device-01', license, 'another-secret')).toBe(false);
    });
    it('normalizes machineId by trimming and lowercasing', () => {
        expect(normalizeMachineId('  AbC-DeF  ')).toBe('abc-def');
    });
});
//# sourceMappingURL=machine-license.test.js.map