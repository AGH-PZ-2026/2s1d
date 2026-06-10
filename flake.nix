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
          nodejs
          corepack
        ];

        shellHook = ''
          export PATH=$PWD/node_modules/.bin:$PATH
          echo "pz-worker dev shell"
          echo "  node:  $(node --version)"
          echo "  pnpm:  $(pnpm --version)"
          echo ""
          echo "  pnpm run dev    # start worker"
        '';
      };
    };
}
