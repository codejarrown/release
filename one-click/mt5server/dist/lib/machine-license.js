import { createHmac, timingSafeEqual } from 'node:crypto';
const LICENSE_PREFIX = 'MID';
export function normalizeMachineId(machineId) {
    return machineId.trim().toLowerCase();
}
export function generateMachineLicense(machineId, secret) {
    const normalized = normalizeMachineId(machineId);
    if (!normalized) {
        throw new Error('machineId is required');
    }
    const digest = createHmac('sha256', secret).update(normalized, 'utf8').digest('hex').toUpperCase();
    return `${LICENSE_PREFIX}-${digest}`;
}
export function verifyMachineLicense(machineId, license, secret) {
    const normalizedMachineId = normalizeMachineId(machineId);
    const normalizedLicense = license.trim().toUpperCase();
    if (!normalizedMachineId || !/^MID-[0-9A-F]{64}$/.test(normalizedLicense)) {
        return false;
    }
    const expected = generateMachineLicense(normalizedMachineId, secret);
    const providedBuf = Buffer.from(normalizedLicense, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (providedBuf.length !== expectedBuf.length)
        return false;
    return timingSafeEqual(providedBuf, expectedBuf);
}
//# sourceMappingURL=machine-license.js.map