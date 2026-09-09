import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

interface QueryErrorProps {
  error: string;
  onRetry: () => void;
}

export function QueryError({ error, onRetry }: QueryErrorProps) {
  return (
    error && (
      <div className="flex flex-col items-start gap-4">
        <Alert variant="error">{error}</Alert>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    )
  );
}

export default QueryError;