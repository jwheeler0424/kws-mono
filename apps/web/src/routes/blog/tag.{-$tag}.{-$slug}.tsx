import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/tag/{-$tag}/{-$slug}')({
  beforeLoad: ({ params }) => {
    const { tag, slug } = params;
    console.log('Loading tag page for tag:', tag, 'and slug:', slug);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { tag, slug } = Route.useParams();
  return (
    <div>
      Hello "/_frontend/blog/tag/{tag}/{slug}"!
    </div>
  );
}
