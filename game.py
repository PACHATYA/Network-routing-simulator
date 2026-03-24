import pygame
import heapq
import random

pygame.init()
WIDTH, HEIGHT = 900, 600
WIN = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("A* Network Routing Simulator")

FONT = pygame.font.SysFont("arial", 18)

WHITE=(255,255,255); BLACK=(0,0,0); BLUE=(0,150,255)
RED=(255,0,0); GREEN=(0,255,0); GREY=(200,200,200)

# Graph Node
class Node:
    def __init__(self, id, x, y):
        self.id = id
        self.x = x
        self.y = y
        self.neighbors = {}

# Heuristic (Euclidean)
def heuristic(a, b):
    return ((a.x-b.x)**2 + (a.y-b.y)**2)**0.5

# A* Algorithm
def astar(nodes, start, end):
    open_set = []
    heapq.heappush(open_set, (0, start))

    g = {n: float('inf') for n in nodes}
    g[start] = 0

    parent = {}

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == end:
            path = []
            while current in parent:
                path.append(current)
                current = parent[current]
            path.append(start)
            return path[::-1]

        for neighbor, weight in current.neighbors.items():
            temp = g[current] + weight
            if temp < g[neighbor]:
                g[neighbor] = temp
                f = temp + heuristic(neighbor, end)
                heapq.heappush(open_set, (f, neighbor))
                parent[neighbor] = current

    return []

# Create Network
nodes = []
for i in range(8):
    nodes.append(Node(i, random.randint(50, 550), random.randint(50, 550)))

# Connect nodes randomly
for n in nodes:
    for other in nodes:
        if n != other and random.random() < 0.4:
            dist = int(heuristic(n, other))
            n.neighbors[other] = dist

start = nodes[0]
end = nodes[-1]

# Simulation
clock = pygame.time.Clock()
path = []
failed_node = None

running = True
while running:
    clock.tick(30)
    WIN.fill(WHITE)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                path = astar(nodes, start, end)
            if event.key == pygame.K_f:
                failed_node = random.choice(nodes[1:-1])
                for n in nodes:
                    if failed_node in n.neighbors:
                        del n.neighbors[failed_node]

    # Draw edges
    for n in nodes:
        for neighbor in n.neighbors:
            pygame.draw.line(WIN, GREY, (n.x, n.y), (neighbor.x, neighbor.y), 1)

    # Draw path
    for i in range(len(path)-1):
        pygame.draw.line(WIN, BLUE, (path[i].x, path[i].y), (path[i+1].x, path[i+1].y), 3)

    # Draw nodes
    for n in nodes:
        color = GREEN if n == start else RED if n == end else BLACK
        if n == failed_node:
            color = (150,0,0)
        pygame.draw.circle(WIN, color, (n.x, n.y), 10)
        WIN.blit(FONT.render(str(n.id), True, WHITE), (n.x-5, n.y-5))

    # Instructions
    WIN.blit(FONT.render("Press SPACE: Route | F: Fail Node", True, BLACK), (600, 50))

    pygame.display.update()

pygame.quit()