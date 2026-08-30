import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home           from './pages/Home';
import MoviesPage     from './pages/MoviesPage';
import AddMoviePage   from './pages/AddMoviePage';
import EditMoviePage  from './pages/EditMoviePage';

export default function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Home/>}/>
        <Route path="/movies"      element={<MoviesPage/>}/>
        <Route path="/add-movie"   element={<AddMoviePage/>}/>
        <Route path="/edit-movie/:id" element={<EditMoviePage/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  );
}
