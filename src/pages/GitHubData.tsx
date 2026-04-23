import { useState } from "react";
import { ModulePage } from "@/components/layout/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Loader2, Search, ExternalLink, Star, GitFork, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

export default function GitHubDataPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);

  const fetchGitHubData = async () => {
    if (!username.trim()) {
      toast.error("Por favor, insira um nome de usuário do GitHub");
      return;
    }

    setLoading(true);
    setUser(null);
    setRepos([]);

    try {
      // Fetch user info
      const userResponse = await fetch(`https://api.github.com/users/${username}`);
      if (!userResponse.ok) {
        throw new Error("Usuário não encontrado");
      }
      const userData = await userResponse.json();
      setUser(userData);

      // Fetch repos
      const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`);
      if (reposResponse.ok) {
        const reposData = await reposResponse.json();
        setRepos(reposData);
      }

      toast.success("Dados do GitHub carregados com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao buscar dados do GitHub");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModulePage 
      title="Dados do GitHub" 
      description="Consulte informações de perfis e repositórios do GitHub" 
      icon={Github}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Buscar Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome de usuário do GitHub (ex: octocat)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchGitHubData()}
                  className="pl-9"
                />
              </div>
              <Button onClick={fetchGitHubData} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                Puxar Dados
              </Button>
            </div>
          </CardContent>
        </Card>

        {user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardContent className="pt-6 text-center">
                <div className="mb-4 flex justify-center">
                  <img 
                    src={user.avatar_url} 
                    alt={user.login} 
                    className="w-24 h-24 rounded-full border-2 border-primary"
                  />
                </div>
                <h2 className="text-xl font-bold">{user.name || user.login}</h2>
                <p className="text-sm text-muted-foreground mb-4">@{user.login}</p>
                {user.bio && <p className="text-sm mb-4 italic">"{user.bio}"</p>}
                
                <div className="grid grid-cols-3 gap-2 py-4 border-y border-border">
                  <div className="text-center">
                    <p className="text-lg font-bold">{user.public_repos}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Repos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{user.followers}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Seguidores</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{user.following}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Seguindo</p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-4 gap-2 text-xs"
                  asChild
                >
                  <a href={user.html_url} target="_blank" rel="noopener noreferrer">
                    Ver Perfil Completo <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Repositórios Recentes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {repos.map((repo) => (
                  <Card key={repo.id} className="hover:ring-1 hover:ring-primary/50 transition-all">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm truncate pr-2" title={repo.name}>
                            {repo.name}
                          </h4>
                          {repo.language && (
                            <Badge variant="secondary" className="text-[10px]">
                              {repo.language}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">
                          {repo.description || "Sem descrição disponível."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Star className="w-3 h-3" /> {repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <GitFork className="w-3 h-3" /> {repo.forks_count}
                          </span>
                        </div>
                        <a 
                          href={repo.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-[10px] flex items-center gap-1"
                        >
                          Repo <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {repos.length === 0 && (
                <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">Nenhum repositório público encontrado.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!user && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Github className="w-16 h-16 mb-4 opacity-10" />
            <p>Busque por um usuário para ver seus dados do GitHub</p>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
