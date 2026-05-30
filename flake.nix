{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      system = "aarch64-darwin";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShellNoCC {
        packages = with pkgs; [
          nodejs-slim
		  corepack
        ];

        shellHook = ''
		  export PATH=$PWD/node_modules/.bin:$PATH
          echo "pz-worker dev shell"
          echo "  node:  $(node --version)"
          echo "  npm:   $(npm --version)"
          echo ""
          echo "Local dev:"
          echo "  docker compose up db    # start MySQL"
          echo "  npm run dev             # start worker (wrangler dev)"
          echo ""
          echo "Migrations:"
          echo "  npm run db:generate     # generate migration from schema"
          echo "  npm run db:migrate      # apply migrations"
        '';
      };
    };
}
