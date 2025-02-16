import { BookmarkSimple, ListBullets, PencilSimpleLine, TagChevron } from "@phosphor-icons/react";
import { useState } from "react";

const AnnotationSidebar = () => {
  const [bookmarks, setBookmarks] = useState([
    {
      id: "1",
      title: "Note 1",
      pageRef: 1,
      level: 0,
    },
    {
      id: "2",
      title: "Note 2",
      pageRef: 3,
      level: 0,
    },
    {
      id: "3",
      title: "Note 3",
      pageRef: 5,
      level: 0,
    },
  ]);
  return (
    <div className="w-full flex-shrink-0 space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-black">Annotation List</h3>
          <div>
            <ListBullets size={25} color="black" />
          </div>
        </div>

        <div className="space-y-1">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="flex items-center justify-between group"
            >
              <button
                // onClick={() => handleBookmarkClick(bookmark.pageRef)}
                className="flex items-center gap-2 text-sm text-gray-700 
                                             hover:text-blue-600 py-1"
              >
                <PencilSimpleLine size={15} />
                <span>{bookmark.title}</span>
              </button>
            </div>
          ))}
          {bookmarks.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">
              No bookmarks yet
            </div>
          )}
        </div>
        <div>
          <button className="border rounded-lg p-1 mt-2 bg-gray-200 w-full hover:bg-gray-300">
            <span className="text-sm text-black">Add Note</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationSidebar;
