import { BookmarkSimple, TagChevron } from "@phosphor-icons/react";
import { useState } from "react";

export interface Bookmark {
  title: string;
  pageRef: number;
}

interface BookmarkProps {
  bookmarks: Bookmark[];
  onJumpToPage: (page: number) => void;
  onAddBookmark: () => void;
}

const BookmarkSidebar = ({ bookmarks, onJumpToPage, onAddBookmark }: BookmarkProps) => {
  return (
    <div className="w-full flex-shrink-0 space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-black">Bookmarks</h3>
          <div>
            <BookmarkSimple size={25} color="black" />
          </div>
        </div>

        <div className="space-y-1">
          {bookmarks.map((bookmark, index) => (
            <div
              key={index}
              className="flex items-center justify-between group"
            >
              <button
                onClick={() => onJumpToPage(bookmark.pageRef)}
                className="flex items-center gap-2 text-sm text-gray-700 
                                             hover:text-blue-600 py-1"
              >
                <TagChevron size={15} />
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
          <button className="border rounded-lg p-1 mt-2 bg-gray-200 w-full hover:bg-gray-300"
            onClick={onAddBookmark}
          >
            <span className="text-sm text-black">Add Bookmark</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookmarkSidebar;
