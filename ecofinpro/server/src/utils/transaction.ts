type UndoFn = () => Promise<void>;
export class TransactionTracker {
    private undoStack: UndoFn[] = [];
    private isRollingBack = false;

    track(undo: UndoFn) {
        if (this.isRollingBack) {
            throw new Error('Cannot track new operations during rollback execution.');
        }
        this.undoStack.push(undo);
    }

    async rollback(): Promise<Error[]> {
        if (this.isRollingBack) return [];
        this.isRollingBack = true;
        const errors: Error[] = [];
        while (this.undoStack.length) {
            const undo = this.undoStack.pop()!;
            try {
                await undo();
            } catch (err) {
                errors.push(err as Error);
            }
        }
        return errors;
    }
}