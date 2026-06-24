import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/category/{-$category}/{-$slug}')({
  component: RouteComponent,
});

function RouteComponent() {
  const { category, slug } = Route.useParams();
  return (
    <div>
      Hello "/_frontend/blog/category/{category}/{slug}"!
    </div>
  );
}
