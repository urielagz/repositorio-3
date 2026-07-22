import { RepositorioUsuarios } from "./repositories/RepositorioUsuarios";

console.log("RepositorioUsuarios:", RepositorioUsuarios);

try {
  const repo = new RepositorioUsuarios();
  console.log("Instancia creada:", repo);
} catch (error) {
  console.error("Error:", error);
}
