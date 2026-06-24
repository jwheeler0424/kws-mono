import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/archive/{-$year}/{-$month}/{-$day}')({
  component: RouteComponent,
});

function RouteComponent() {
  const { year, month, day } = Route.useParams();

  if (!year) return <div>Select a year</div>;
  if (!month) return <div>Year: {year}</div>;
  if (!day)
    return (
      <div>
        Month: {year}/{month}
      </div>
    );

  return (
    <div>
      Date: {year}/{month}/{day}
    </div>
  );
}
