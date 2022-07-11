import "./Home.css";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import Post from "../Post/Post";
import Recommendations from "../Recommendations/Recommendations";
import ReactLoading from "react-loading";

export const useEffectOnce = (effect) => {
  const destroyFunc = useRef();
  const effectCalled = useRef(false);
  const renderAfterCalled = useRef(false);
  const [val, setVal] = useState(0);

  if (effectCalled.current) {
    renderAfterCalled.current = true;
  }

  useEffect(() => {
    // only execute the effect first time around
    if (!effectCalled.current) {
      destroyFunc.current = effect();
      effectCalled.current = true;
    }

    // this forces one render after the effect is run
    setVal((val) => val + 1);

    return () => {
      // if the comp didn't render since the useEffect was called,
      // we know it's the dummy React cycle
      if (!renderAfterCalled.current) {
        return;
      }
      if (destroyFunc.current) {
        destroyFunc.current();
      }
    };
  }, []);
};

export default function Home({ setLogin, userObjectId, setUserObjectId }) {
  const [posts, setPosts] = useState({});
  const [isFetching, setIsFetching] = useState(true);

  useEffectOnce(() => {
    async function getProfile() {
      setIsFetching(true);
      const response = await axios.post("http://localhost:8888/");
      setUserObjectId(response.data.objectId);
    }

    async function getFeed() {
      setIsFetching(true);
      await axios
        .get("http://localhost:8888/feed")
        .then((allPosts) => {
          setPosts(allPosts.data);
          setIsFetching(false);
        })
        .catch((error) => {
          <h1>{error}</h1>;
        });
    }
    setLogin(true);
    getProfile();
    getFeed();
  }, []);

  if (isFetching) {
    return (
      <div className="loading">
        <h1>Loading</h1>
        <ReactLoading type={"bars"} />
      </div>
    );
  } else {
    return (
      <div className="home">
        <div className="row">
          <div className="col-sm-8">
            <h1 className="home"> Feed</h1>
            <div className="grid">
              {posts.map((currPost) => {
                return (
                  <Post
                    selectedSongId={currPost.selectedSongId}
                    selectedSongUrl={currPost.selectedSongUrl}
                    selectedSongName={currPost.selectedSongName}
                    review={currPost.review}
                    mood={currPost.mood}
                    rating={currPost.rating}
                    userId={currPost.userId}
                    postId={currPost.objectId}
                    userObjectId={userObjectId}
                    createdAt={currPost.createdAt}
                    key={currPost.objectId}
                    isFetching={isFetching}
                    setIsFetching={setIsFetching}
                    isProfile={false}
                  />
                );
              })}
            </div>
          </div>
          <Recommendations />
        </div>
      </div>
    );
  }
}
