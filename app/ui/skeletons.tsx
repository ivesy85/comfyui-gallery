export const GenerationsGallerySkeleton = () => {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 rounded-lg p-2 md:pt-0">
          {Array.from({ length: 32 }).map((_, index) => (
            <div
              key={index}
              className="relative w-full h-0 pb-[100%] rounded-md overflow-hidden bg-gray-300 animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};