
import type {
    AdvancedVerdictRequest,
} from '../../shared/investigation';

export function isRecord(
    value: unknown
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

export function isValidIdentifier(
    value: unknown
): value is string {
    return (
        typeof value === 'string' &&
        value.length > 0 &&
        value.length <= 100 &&
        /^[a-zA-Z0-9_-]+$/.test(value)
    );
}

export function isAdvancedVerdictRequest(
    value: unknown
): value is AdvancedVerdictRequest & Record<string, unknown> {
    if (!isRecord(value)) {
        return false;
    }

    if (!isValidIdentifier(value.caseId)) {
        return false;
    }

    if (!isValidIdentifier(value.suspectId)) {
        return false;
    }

    if (
        value.motiveId !== null &&
        !isValidIdentifier(value.motiveId)
    ) {
        return false;
    }

    if (!Array.isArray(value.evidenceIds)) {
        return false;
    }

    if (
        value.evidenceIds.length === 0 ||
        value.evidenceIds.length > 24
    ) {
        return false;
    }

    if (!value.evidenceIds.every(isValidIdentifier)) {
        return false;
    }

    const uniqueEvidence = new Set(value.evidenceIds);

    if (uniqueEvidence.size !== value.evidenceIds.length) {
        return false;
    }

    return true;
}
